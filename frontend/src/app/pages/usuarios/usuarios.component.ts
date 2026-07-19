import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UsuarioService, UsuarioGestion, RolRef } from '../../services/usuario.service';
import { AuthService } from '../../services/auth.service';

// CA-020 · Gestión de Usuarios (exclusivo ADMIN)
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss']
})
export class UsuariosComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  usuarios = signal<UsuarioGestion[]>([]);
  roles = signal<RolRef[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);
  editandoId = signal<string | null>(null);
  mostrarForm = signal(false);

  miId = () => this.authService.currentUser()?.id ?? '';

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
    rolId: ['', Validators.required]
  });

  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.usuarioService.listar().subscribe({
      next: d => { this.usuarios.set(d); this.cargando.set(false); },
      error: err => { this.error.set(err.message); this.cargando.set(false); }
    });
    this.usuarioService.roles().subscribe({ next: r => this.roles.set(r) });
  }

  nuevo() {
    this.editandoId.set(null);
    this.form.reset({ nombre: '', email: '', password: '', rolId: '' });
    this.form.get('password')?.addValidators(Validators.required);
    this.form.get('password')?.updateValueAndValidity();
    this.mostrarForm.set(true);
  }

  editar(u: UsuarioGestion) {
    this.editandoId.set(u.id);
    this.form.reset({ nombre: u.nombre, email: u.email, password: '', rolId: u.rol.id });
    // Al editar, la contraseña es opcional (vacío = se conserva la actual)
    this.form.get('password')?.removeValidators(Validators.required);
    this.form.get('password')?.updateValueAndValidity();
    this.mostrarForm.set(true);
  }

  cancelar() {
    this.mostrarForm.set(false);
    this.editandoId.set(null);
  }

  guardar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error.set(null); this.ok.set(null);
    const v = this.form.value;
    const id = this.editandoId();

    const op = id
      ? this.usuarioService.actualizar(id, {
          nombre: v.nombre!, email: v.email!, rolId: v.rolId!,
          password: v.password ? v.password : undefined
        })
      : this.usuarioService.crear(v.nombre!, v.email!, v.password!, v.rolId!);

    op.subscribe({
      next: () => {
        this.ok.set(id ? 'Usuario actualizado.' : 'Usuario creado.');
        this.mostrarForm.set(false);
        this.cargar();
      },
      error: err => this.error.set(err.message)
    });
  }

  eliminar(u: UsuarioGestion) {
    if (!confirm(`¿Eliminar al usuario "${u.nombre}" (${u.email})?`)) return;
    this.error.set(null); this.ok.set(null);
    this.usuarioService.eliminar(u.id).subscribe({
      next: () => { this.ok.set('Usuario eliminado.'); this.cargar(); },
      error: err => this.error.set(err.message)
    });
  }

  contarPorRol(rol: string): number {
    return this.usuarios().filter(u => u.rol?.nombre === rol).length;
  }
}
