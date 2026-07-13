import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MateriaService } from '../../services/materia.service';
import { AuthService } from '../../services/auth.service';
import { Materia } from '../../models/materia.model';
import { Role } from '../../models/user.model';

// CA-016 · Componente de Materias (Sprint 2 · HU-S2.2)
@Component({
  selector: 'app-materias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './materias.component.html',
  styleUrls: ['./materias.component.scss']
})
export class MateriasComponent implements OnInit {
  private materiaService = inject(MateriaService);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  materias = signal<Materia[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);
  editandoId = signal<string | null>(null);
  mostrarForm = signal(false);

  // Solo ADMIN y DOCENTE pueden gestionar materias
  puedeGestionar = (): boolean => {
    const rol = this.authService.getUserRole();
    return rol === Role.ADMIN || rol === Role.DOCENTE;
  };
  esAdmin = (): boolean => this.authService.getUserRole() === Role.ADMIN;

  form = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(20)]],
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    creditos: [0, [Validators.required, Validators.min(0), Validators.max(20)]],
    descripcion: ['']
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.materiaService.listar().subscribe({
      next: data => { this.materias.set(data); this.cargando.set(false); },
      error: err => { this.error.set(err.message); this.cargando.set(false); }
    });
  }

  nuevaMateria() {
    this.editandoId.set(null);
    this.form.reset({ codigo: '', nombre: '', creditos: 0, descripcion: '' });
    this.mostrarForm.set(true);
  }

  editar(m: Materia) {
    this.editandoId.set(m.id);
    this.form.reset({
      codigo: m.codigo,
      nombre: m.nombre,
      creditos: m.creditos,
      descripcion: m.descripcion || ''
    });
    this.mostrarForm.set(true);
  }

  cancelar() {
    this.mostrarForm.set(false);
    this.editandoId.set(null);
  }

  guardar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error.set(null);
    const input = {
      codigo: this.form.value.codigo!,
      nombre: this.form.value.nombre!,
      creditos: Number(this.form.value.creditos),
      descripcion: this.form.value.descripcion || undefined
    };

    const id = this.editandoId();
    const op = id
      ? this.materiaService.actualizar(id, input)
      : this.materiaService.crear(input);

    op.subscribe({
      next: () => { this.mostrarForm.set(false); this.cargar(); },
      error: err => this.error.set(err.message)
    });
  }

  eliminar(m: Materia) {
    if (!confirm(`¿Eliminar la materia "${m.nombre}" (${m.codigo})?`)) return;
    this.error.set(null);
    this.materiaService.eliminar(m.id).subscribe({
      next: () => this.cargar(),
      error: err => this.error.set(err.message)
    });
  }
}
