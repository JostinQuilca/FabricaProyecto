import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CalificacionService } from '../../services/calificacion.service';
import { AuthService } from '../../services/auth.service';
import { Calificacion } from '../../models/calificacion.model';
import { Usuario, Role } from '../../models/user.model';

// CA-019 · Componente de Calificaciones
@Component({
  selector: 'app-calificaciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './calificaciones.component.html',
  styleUrls: ['./calificaciones.component.scss']
})
export class CalificacionesComponent implements OnInit {
  private calificacionService = inject(CalificacionService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  calificaciones = signal<Calificacion[]>([]);
  materias = signal<{ id: string; codigo: string; nombre: string }[]>([]);
  estudiantes = signal<Usuario[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);

  puedeGestionar = (): boolean => {
    const rol = this.authService.getUserRole();
    return rol === Role.ADMIN || rol === Role.DOCENTE;
  };
  esAdmin = (): boolean => this.authService.getUserRole() === Role.ADMIN;

  form = this.fb.group({
    estudianteId: ['', Validators.required],
    materiaId: ['', Validators.required],
    nota: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    periodo: ['', Validators.required],
    observacion: ['']
  });

  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.calificacionService.listar().subscribe({
      next: d => { this.calificaciones.set(d); this.cargando.set(false); },
      error: err => { this.error.set(err.message); this.cargando.set(false); }
    });
    this.calificacionService.materias().subscribe({ next: d => this.materias.set(d) });
    this.calificacionService.estudiantes().subscribe({ next: d => this.estudiantes.set(d) });
  }

  registrar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error.set(null); this.ok.set(null);
    const v = this.form.value;
    this.calificacionService.registrar(v.estudianteId!, v.materiaId!, Number(v.nota), v.periodo!, v.observacion || undefined)
      .subscribe({
        next: () => { this.ok.set('Calificación registrada.'); this.form.reset({ estudianteId: '', materiaId: '', nota: 0, periodo: '', observacion: '' }); this.cargar(); },
        error: err => this.error.set(err.message)
      });
  }

  eliminar(c: Calificacion) {
    if (!confirm(`¿Eliminar la nota de ${c.estudiante.nombre} en ${c.materia.codigo}?`)) return;
    this.error.set(null); this.ok.set(null);
    this.calificacionService.eliminar(c.id).subscribe({
      next: () => this.cargar(),
      error: err => this.error.set(err.message)
    });
  }
}
