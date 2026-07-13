import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InscripcionService } from '../../services/inscripcion.service';
import { MateriaService } from '../../services/materia.service';
import { AuthService } from '../../services/auth.service';
import { Inscripcion } from '../../models/inscripcion.model';
import { Materia } from '../../models/materia.model';
import { Usuario, Role } from '../../models/user.model';

// CA-017 · Componente de Inscripciones (Sprint 2 · HU-S2.4)
@Component({
  selector: 'app-inscripciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './inscripciones.component.html',
  styleUrls: ['./inscripciones.component.scss']
})
export class InscripcionesComponent implements OnInit {
  private inscripcionService = inject(InscripcionService);
  private materiaService = inject(MateriaService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  inscripciones = signal<Inscripcion[]>([]);
  materias = signal<Materia[]>([]);
  estudiantes = signal<Usuario[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);

  // ADMIN y DOCENTE pueden inscribir a cualquier estudiante
  puedeGestionar = (): boolean => {
    const rol = this.authService.getUserRole();
    return rol === Role.ADMIN || rol === Role.DOCENTE;
  };

  form = this.fb.group({
    estudianteId: ['', Validators.required],
    materiaId: ['', Validators.required]
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.inscripcionService.listar().subscribe({
      next: data => { this.inscripciones.set(data); this.cargando.set(false); },
      error: err => { this.error.set(err.message); this.cargando.set(false); }
    });
    this.materiaService.listar().subscribe({ next: d => this.materias.set(d) });
    this.inscripcionService.estudiantes().subscribe({ next: d => this.estudiantes.set(d) });
  }

  inscribir() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error.set(null); this.ok.set(null);
    const { estudianteId, materiaId } = this.form.value;
    this.inscripcionService.inscribir(estudianteId!, materiaId!).subscribe({
      next: () => {
        this.ok.set('Estudiante inscrito correctamente.');
        this.form.reset({ estudianteId: '', materiaId: '' });
        this.cargar();
      },
      error: err => this.error.set(err.message)
    });
  }

  desinscribir(i: Inscripcion) {
    if (!confirm(`¿Desinscribir a ${i.estudiante.nombre} de ${i.materia.nombre}?`)) return;
    this.error.set(null); this.ok.set(null);
    this.inscripcionService.desinscribir(i.estudiante.id, i.materia.id).subscribe({
      next: () => { this.ok.set('Estudiante desinscrito.'); this.cargar(); },
      error: err => this.error.set(err.message)
    });
  }
}
